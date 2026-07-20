```fortran
subroutine dgejsv (
        character*1 joba,
        character*1 jobu,
        character*1 jobv,
        character*1 jobr,
        character*1 jobt,
        character*1 jobp,
        integer m,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( n ) sva,
        double precision, dimension( ldu, * ) u,
        integer ldu,
        double precision, dimension( ldv, * ) v,
        integer ldv,
        double precision, dimension( lwork ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        integer info
)
```

DGEJSV computes the singular value decomposition (SVD) of a real M-by-N
matrix [A], where M >= N. The SVD of [A] is written as

[A] = [U] \* [SIGMA] \* [V]^t,

where [SIGMA] is an N-by-N (M-by-N) matrix which is zero except for its N
diagonal elements, [U] is an M-by-N (or M-by-M) orthonormal matrix, and
[V] is an N-by-N orthogonal matrix. The diagonal elements of [SIGMA] are
the singular values of [A]. The columns of [U] and [V] are the left and
the right singular vectors of [A], respectively. The matrices [U] and [V]
are computed and stored in the arrays U and V, respectively. The diagonal
of [SIGMA] is computed and stored in the array SVA.
DGEJSV can sometimes compute tiny singular values and their singular vectors much
more accurately than other SVD routines, see below under Further Details.

## Parameters
JOBA : CHARACTER\*1 [in]
> Specifies the level of accuracy:
> = 'C': This option works well (high relative accuracy) if A = B \* D,
> with well-conditioned B and arbitrary diagonal matrix D.
> The accuracy cannot be spoiled by COLUMN scaling. The
> accuracy of the computed output depends on the condition of
> B, and the procedure aims at the best theoretical accuracy.
> The relative error max_{i=1:N}|d sigma_i| / sigma_i is
> bounded by f(M,N)\*epsilon\* cond(B), independent of D.
> The input matrix is preprocessed with the QRF with column
> pivoting. This initial preprocessing and preconditioning by
> a rank revealing QR factorization is common for all values of
> JOBA. Additional actions are specified as follows:
> = 'E': Computation as with 'C' with an additional estimate of the
> condition number of B. It provides a realistic error bound.
> = 'F': If A = D1 \* C \* D2 with ill-conditioned diagonal scalings
> D1, D2, and well-conditioned matrix C, this option gives
> higher accuracy than the 'C' option. If the structure of the
> input matrix is not known, and relative accuracy is
> desirable, then this option is advisable. The input matrix A
> is preprocessed with QR factorization with FULL (row and
> column) pivoting.
> = 'G': Computation as with 'F' with an additional estimate of the
> condition number of B, where A=D\*B. If A has heavily weighted
> rows, then using this condition number gives too pessimistic
> error bound.
> = 'A': Small singular values are the noise and the matrix is treated
> as numerically rank deficient. The error in the computed
> singular values is bounded by f(m,n)\*epsilon\*||A||.
> The computed SVD A = U \* S \* V^t restores A up to
> f(m,n)\*epsilon\*||A||.
> This gives the procedure the licence to discard (set to zero)
> all singular values below N\*epsilon\*||A||.
> = 'R': Similar as in 'A'. Rank revealing property of the initial
> QR factorization is used do reveal (using triangular factor)
> a gap sigma_{r+1} < epsilon \* sigma_r in which case the
> numerical RANK is declared to be r. The SVD is computed with
> absolute error bounds, but more accurately than with 'A'.

JOBU : CHARACTER\*1 [in]
> Specifies whether to compute the columns of U:
> = 'U': N columns of U are returned in the array U.
> = 'F': full set of M left sing. vectors is returned in the array U.
> = 'W': U may be used as workspace of length M\*N. See the description
> of U.
> = 'N': U is not computed.

JOBV : CHARACTER\*1 [in]
> Specifies whether to compute the matrix V:
> = 'V': N columns of V are returned in the array V; Jacobi rotations
> are not explicitly accumulated.
> = 'J': N columns of V are returned in the array V, but they are
> computed as the product of Jacobi rotations. This option is
> allowed only if JOBU .NE. 'N', i.e. in computing the full SVD.
> = 'W': V may be used as workspace of length N\*N. See the description
> of V.
> = 'N': V is not computed.

JOBR : CHARACTER\*1 [in]
> Specifies the RANGE for the singular values. Issues the licence to
> set to zero small positive singular values if they are outside
> specified range. If A .NE. 0 is scaled so that the largest singular
> value of c\*A is around DSQRT(BIG), BIG=SLAMCH('O'), then JOBR issues
> the licence to kill columns of A whose norm in c\*A is less than
> DSQRT(SFMIN) (for JOBR = 'R'), or less than SMALL=SFMIN/EPSLN,
> where SFMIN=SLAMCH('S'), EPSLN=SLAMCH('E').
> = 'N': Do not kill small columns of c\*A. This option assumes that
> BLAS and QR factorizations and triangular solvers are
> implemented to work in that range. If the condition of A
> is greater than BIG, use DGESVJ.
> = 'R': RESTRICTED range for sigma(c\*A) is [DSQRT(SFMIN), DSQRT(BIG)]
> (roughly, as described above). This option is recommended.
> ~~~~~~~~~~~~~~~~~~~~~~~~~~~
> For computing the singular values in the FULL range [SFMIN,BIG]
> use DGESVJ.

JOBT : CHARACTER\*1 [in]
> If the matrix is square then the procedure may determine to use
> transposed A if A^t seems to be better with respect to convergence.
> If the matrix is not square, JOBT is ignored. This is subject to
> changes in the future.
> The decision is based on two values of entropy over the adjoint
> orbit of A^t \* A. See the descriptions of WORK(6) and WORK(7).
> = 'T': transpose if entropy test indicates possibly faster
> convergence of Jacobi process if A^t is taken as input. If A is
> replaced with A^t, then the row pivoting is included automatically.
> = 'N': do not speculate.
> This option can be used to compute only the singular values, or the
> full SVD (U, SIGMA and V). For only one set of singular vectors
> (U or V), the caller should provide both U and V, as one of the
> matrices is used as workspace if the matrix A is transposed.
> The implementer can easily remove this constraint and make the
> code more complicated. See the descriptions of U and V.

JOBP : CHARACTER\*1 [in]
> Issues the licence to introduce structured perturbations to drown
> denormalized numbers. This licence should be active if the
> denormals are poorly implemented, causing slow computation,
> especially in cases of fast convergence (!). For details see [1,2].
> For the sake of simplicity, this perturbations are included only
> when the full SVD or only the singular values are requested. The
> implementer/user can easily add the perturbation for the cases of
> computing one set of singular vectors.
> = 'P': introduce perturbation
> = 'N': do not perturb

M : INTEGER [in]
> The number of rows of the input matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the input matrix A. M >= N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

SVA : DOUBLE PRECISION array, dimension (N) [out]
> On exit,
> - For WORK(1)/WORK(2) = ONE: The singular values of A. During the
> computation SVA contains Euclidean column norms of the
> iterated matrices in the array A.
> - For WORK(1) .NE. WORK(2): The singular values of A are
> (WORK(1)/WORK(2)) \* SVA(1:N). This factored form is used if
> sigma_max(A) overflows or if small singular values have been
> saved from underflow by scaling the input matrix A.
> - If JOBR='R' then some of the singular values may be returned
> as exact zeros obtained by  because they are
> below the numerical rank threshold or are denormalized numbers.

U : DOUBLE PRECISION array, dimension ( LDU, N ) or ( LDU, M ) [out]
> If JOBU = 'U', then U contains on exit the M-by-N matrix of
> the left singular vectors.
> If JOBU = 'F', then U contains on exit the M-by-M matrix of
> the left singular vectors, including an ONB
> of the orthogonal complement of the Range(A).
> If JOBU = 'W'  .AND. (JOBV = 'V' .AND. JOBT = 'T' .AND. M = N),
> then U is used as workspace if the procedure
> replaces A with A^t. In that case, [V] is computed
> in U as left singular vectors of A^t and then
> copied back to the V array. This 'W' option is just
> a reminder to the caller that in this case U is
> reserved as workspace of length N\*N.
> If JOBU = 'N'  U is not referenced, unless JOBT='T'.

LDU : INTEGER [in]
> The leading dimension of the array U,  LDU >= 1.
> IF  JOBU = 'U' or 'F' or 'W',  then LDU >= M.

V : DOUBLE PRECISION array, dimension ( LDV, N ) [out]
> If JOBV = 'V', 'J' then V contains on exit the N-by-N matrix of
> the right singular vectors;
> If JOBV = 'W', AND (JOBU = 'U' AND JOBT = 'T' AND M = N),
> then V is used as workspace if the procedure
> replaces A with A^t. In that case, [U] is computed
> in V as right singular vectors of A^t and then
> copied back to the U array. This 'W' option is just
> a reminder to the caller that in this case V is
> reserved as workspace of length N\*N.
> If JOBV = 'N'  V is not referenced, unless JOBT='T'.

LDV : INTEGER [in]
> The leading dimension of the array V,  LDV >= 1.
> If JOBV = 'V' or 'J' or 'W', then LDV >= N.

WORK : DOUBLE PRECISION array, dimension (MAX(7,LWORK)) [out]
> On exit, if N > 0 .AND. M > 0 (else not referenced),
> WORK(1) = SCALE = WORK(2) / WORK(1) is the scaling factor such
> that SCALE\*SVA(1:N) are the computed singular values
> of A. (See the description of SVA().)
> WORK(2) = See the description of WORK(1).
> WORK(3) = SCONDA is an estimate for the condition number of
> column equilibrated A. (If JOBA = 'E' or 'G')
> SCONDA is an estimate of DSQRT(||(R^t \* R)^(-1)||_1).
> It is computed using DPOCON. It holds
> N^(-1/4) \* SCONDA <= ||R^(-1)||_2 <= N^(1/4) \* SCONDA
> where R is the triangular factor from the QRF of A.
> However, if R is truncated and the numerical rank is
> determined to be strictly smaller than N, SCONDA is
> returned as -1, thus indicating that the smallest
> singular values might be lost.
> 
> If full SVD is needed, the following two condition numbers are
> useful for the analysis of the algorithm. They are provided for
> a developer/implementer who is familiar with the details of
> the method.
> 
> WORK(4) = an estimate of the scaled condition number of the
> triangular factor in the first QR factorization.
> WORK(5) = an estimate of the scaled condition number of the
> triangular factor in the second QR factorization.
> The following two parameters are computed if JOBT = 'T'.
> They are provided for a developer/implementer who is familiar
> with the details of the method.
> 
> WORK(6) = the entropy of A^t\*A :: this is the Shannon entropy
> of diag(A^t\*A) / Trace(A^t\*A) taken as point in the
> probability simplex.
> WORK(7) = the entropy of A\*A^t.

LWORK : INTEGER [in]
> Length of WORK to confirm proper allocation of work space.
> LWORK depends on the job:
> 
> If only SIGMA is needed (JOBU = 'N', JOBV = 'N') and
> -> .. no scaled condition estimate required (JOBE = 'N'):
> LWORK >= max(2\*M+N,4\*N+1,7). This is the minimal requirement.
> ->> For optimal performance (blocked code) the optimal value
> is LWORK >= max(2\*M+N,3\*N+(N+1)\*NB,7). Here NB is the optimal
> block size for DGEQP3 and DGEQRF.
> In general, optimal LWORK is computed as
> LWORK >= max(2\*M+N,N+LWORK(DGEQP3),N+LWORK(DGEQRF), 7).
> -> .. an estimate of the scaled condition number of A is
> required (JOBA='E', 'G'). In this case, LWORK is the maximum
> of the above and N\*N+4\*N, i.e. LWORK >= max(2\*M+N,N\*N+4\*N,7).
> ->> For optimal performance (blocked code) the optimal value
> is LWORK >= max(2\*M+N,3\*N+(N+1)\*NB, N\*N+4\*N, 7).
> In general, the optimal length LWORK is computed as
> LWORK >= max(2\*M+N,N+LWORK(DGEQP3),N+LWORK(DGEQRF),
> N+N\*N+LWORK(DPOCON),7).
> 
> If SIGMA and the right singular vectors are needed (JOBV = 'V'),
> -> the minimal requirement is LWORK >= max(2\*M+N,4\*N+1,7).
> -> For optimal performance, LWORK >= max(2\*M+N,3\*N+(N+1)\*NB,7),
> where NB is the optimal block size for DGEQP3, DGEQRF, DGELQF,
> DORMLQ. In general, the optimal length LWORK is computed as
> LWORK >= max(2\*M+N,N+LWORK(DGEQP3), N+LWORK(DPOCON),
> N+LWORK(DGELQF), 2\*N+LWORK(DGEQRF), N+LWORK(DORMLQ)).
> 
> If SIGMA and the left singular vectors are needed
> -> the minimal requirement is LWORK >= max(2\*M+N,4\*N+1,7).
> -> For optimal performance:
> if JOBU = 'U' :: LWORK >= max(2\*M+N,3\*N+(N+1)\*NB,7),
> if JOBU = 'F' :: LWORK >= max(2\*M+N,3\*N+(N+1)\*NB,N+M\*NB,7),
> where NB is the optimal block size for DGEQP3, DGEQRF, DORMQR.
> In general, the optimal length LWORK is computed as
> LWORK >= max(2\*M+N,N+LWORK(DGEQP3),N+LWORK(DPOCON),
> 2\*N+LWORK(DGEQRF), N+LWORK(DORMQR)).
> Here LWORK(DORMQR) equals N\*NB (for JOBU = 'U') or
> M\*NB (for JOBU = 'F').
> 
> If the full SVD is needed: (JOBU = 'U' or JOBU = 'F') and
> -> if JOBV = 'V'
> the minimal requirement is LWORK >= max(2\*M+N,6\*N+2\*N\*N).
> -> if JOBV = 'J' the minimal requirement is
> LWORK >= max(2\*M+N, 4\*N+N\*N,2\*N+N\*N+6).
> -> For optimal performance, LWORK should be additionally
> larger than N+M\*NB, where NB is the optimal block size
> for DORMQR.

IWORK : INTEGER array, dimension (MAX(3,M+3\*N)). [out]
> On exit,
> IWORK(1) = the numerical rank determined after the initial
> QR factorization with pivoting. See the descriptions
> of JOBA and JOBR.
> IWORK(2) = the number of the computed nonzero singular values
> IWORK(3) = if nonzero, a warning message:
> If IWORK(3) = 1 then some of the column norms of A
> were denormalized floats. The requested high accuracy
> is not warranted by the data.

INFO : INTEGER [out]
> < 0:  if INFO = -i, then the i-th argument had an illegal value.
> = 0:  successful exit;
> > 0:  DGEJSV  did not converge in the maximal allowed number
> of sweeps. The computed values may be inaccurate.
