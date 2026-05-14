```fortran
subroutine dgesvdq (
        character joba,
        character jobp,
        character jobr,
        character jobu,
        character jobv,
        integer m,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) s,
        double precision, dimension( ldu, * ) u,
        integer ldu,
        double precision, dimension( ldv, * ) v,
        integer ldv,
        integer numrank,
        integer, dimension( * ) iwork,
        integer liwork,
        double precision, dimension( * ) work,
        integer lwork,
        double precision, dimension( * ) rwork,
        integer lrwork,
        integer info
)
```

DGESVDQ computes the singular value decomposition (SVD) of a real
M-by-N matrix A, where M >= N. The SVD of A is written as
[++]   [xx]   [x0]   [xx]
A = U \* SIGMA \* V^\*,  [++] = [xx] \* [ox] \* [xx]
[++]   [xx]
where SIGMA is an N-by-N diagonal matrix, U is an M-by-N orthonormal
matrix, and V is an N-by-N orthogonal matrix. The diagonal elements
of SIGMA are the singular values of A. The columns of U and V are the
left and the right singular vectors of A, respectively.

## Parameters
JOBA : CHARACTER\*1 [in]
> Specifies the level of accuracy in the computed SVD
> = 'A' The requested accuracy corresponds to having the backward
> error bounded by || delta A ||_F <= f(m,n) \* EPS \* || A ||_F,
> where EPS = DLAMCH('Epsilon'). This authorises DGESVDQ to
> truncate the computed triangular factor in a rank revealing
> QR factorization whenever the truncated part is below the
> threshold of the order of EPS \* ||A||_F. This is aggressive
> truncation level.
> = 'M' Similarly as with 'A', but the truncation is more gentle: it
> is allowed only when there is a drop on the diagonal of the
> triangular factor in the QR factorization. This is medium
> truncation level.
> = 'H' High accuracy requested. No numerical rank determination based
> on the rank revealing QR factorization is attempted.
> = 'E' Same as 'H', and in addition the condition number of column
> scaled A is estimated and returned in  RWORK(1).
> N^(-1/4)\*RWORK(1) <= ||pinv(A_scaled)||_2 <= N^(1/4)\*RWORK(1)

JOBP : CHARACTER\*1 [in]
> = 'P' The rows of A are ordered in decreasing order with respect to
> ||A(i,:)||_\infty. This enhances numerical accuracy at the cost
> of extra data movement. Recommended for numerical robustness.
> = 'N' No row pivoting.

JOBR : CHARACTER\*1 [in]
> = 'T' After the initial pivoted QR factorization, DGESVD is applied to
> the transposed R\*\*T of the computed triangular factor R. This involves
> some extra data movement (matrix transpositions). Useful for
> experiments, research and development.
> = 'N' The triangular factor R is given as input to DGESVD. This may be
> preferred as it involves less data movement.

JOBU : CHARACTER\*1 [in]
> = 'A' All M left singular vectors are computed and returned in the
> matrix U. See the description of U.
> = 'S' or 'U' N = min(M,N) left singular vectors are computed and returned
> in the matrix U. See the description of U.
> = 'R' Numerical rank NUMRANK is determined and only NUMRANK left singular
> vectors are computed and returned in the matrix U.
> = 'F' The N left singular vectors are returned in factored form as the
> product of the Q factor from the initial QR factorization and the
> N left singular vectors of (R\*\*T , 0)\*\*T. If row pivoting is used,
> then the necessary information on the row pivoting is stored in
> IWORK(N+1:N+M-1).
> = 'N' The left singular vectors are not computed.

JOBV : CHARACTER\*1 [in]
> = 'A', 'V' All N right singular vectors are computed and returned in
> the matrix V.
> = 'R' Numerical rank NUMRANK is determined and only NUMRANK right singular
> vectors are computed and returned in the matrix V. This option is
> allowed only if JOBU = 'R' or JOBU = 'N'; otherwise it is illegal.
> = 'N' The right singular vectors are not computed.

M : INTEGER [in]
> The number of rows of the input matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the input matrix A.  M >= N >= 0.

A : DOUBLE PRECISION array of dimensions LDA x N [in,out]
> On entry, the input matrix A.
> On exit, if JOBU .NE. 'N' or JOBV .NE. 'N', the lower triangle of A contains
> the Householder vectors as stored by DGEQP3. If JOBU = 'F', these Householder
> vectors together with WORK(1:N) can be used to restore the Q factors from
> the initial pivoted QR factorization of A. See the description of U.

LDA : INTEGER. [in]
> The leading dimension of the array A.  LDA >= max(1,M).

S : DOUBLE PRECISION array of dimension N. [out]
> The singular values of A, ordered so that S(i) >= S(i+1).

U : DOUBLE PRECISION array, dimension [out]
> LDU x M if JOBU = 'A'; see the description of LDU. In this case,
> on exit, U contains the M left singular vectors.
> LDU x N if JOBU = 'S', 'U', 'R' ; see the description of LDU. In this
> case, U contains the leading N or the leading NUMRANK left singular vectors.
> LDU x N if JOBU = 'F' ; see the description of LDU. In this case U
> contains N x N orthogonal matrix that can be used to form the left
> singular vectors.
> If JOBU = 'N', U is not referenced.

LDU : INTEGER. [in]
> The leading dimension of the array U.
> If JOBU = 'A', 'S', 'U', 'R',  LDU >= max(1,M).
> If JOBU = 'F',                 LDU >= max(1,N).
> Otherwise,                     LDU >= 1.

V : DOUBLE PRECISION array, dimension [out]
> LDV x N if JOBV = 'A', 'V', 'R' or if JOBA = 'E' .
> If JOBV = 'A', or 'V',  V contains the N-by-N orthogonal matrix  V\*\*T;
> If JOBV = 'R', V contains the first NUMRANK rows of V\*\*T (the right
> singular vectors, stored rowwise, of the NUMRANK largest singular values).
> If JOBV = 'N' and JOBA = 'E', V is used as a workspace.
> If JOBV = 'N', and JOBA.NE.'E', V is not referenced.

LDV : INTEGER [in]
> The leading dimension of the array V.
> If JOBV = 'A', 'V', 'R',  or JOBA = 'E', LDV >= max(1,N).
> Otherwise,                               LDV >= 1.

NUMRANK : INTEGER [out]
> NUMRANK is the numerical rank first determined after the rank
> revealing QR factorization, following the strategy specified by the
> value of JOBA. If JOBV = 'R' and JOBU = 'R', only NUMRANK
> leading singular values and vectors are then requested in the call
> of DGESVD. The final value of NUMRANK might be further reduced if
> some singular values are computed as zeros.

IWORK : INTEGER array, dimension (max(1, LIWORK)). [out]
> On exit, IWORK(1:N) contains column pivoting permutation of the
> rank revealing QR factorization.
> If JOBP = 'P', IWORK(N+1:N+M-1) contains the indices of the sequence
> of row swaps used in row pivoting. These can be used to restore the
> left singular vectors in the case JOBU = 'F'.
> 
> If LIWORK, LWORK, or LRWORK = -1, then on exit, if INFO = 0,
> IWORK(1) returns the minimal LIWORK.

LIWORK : INTEGER [in]
> The dimension of the array IWORK.
> LIWORK >= N + M - 1,     if JOBP = 'P' and JOBA .NE. 'E';
> LIWORK >= N              if JOBP = 'N' and JOBA .NE. 'E';
> LIWORK >= N + M - 1 + N, if JOBP = 'P' and JOBA = 'E';
> LIWORK >= N + N          if JOBP = 'N' and JOBA = 'E'.
> 
> If LIWORK = -1, then a workspace query is assumed; the routine
> only calculates and returns the optimal and minimal sizes
> for the WORK, IWORK, and RWORK arrays, and no error
> message related to LWORK is issued by XERBLA.

WORK : DOUBLE PRECISION array, dimension (max(2, LWORK)), used as a workspace. [out]
> On exit, if, on entry, LWORK.NE.-1, WORK(1:N) contains parameters
> needed to recover the Q factor from the QR factorization computed by
> DGEQP3.
> 
> If LIWORK, LWORK, or LRWORK = -1, then on exit, if INFO = 0,
> WORK(1) returns the optimal LWORK, and
> WORK(2) returns the minimal LWORK.

LWORK : INTEGER [in,out]
> The dimension of the array WORK. It is determined as follows:
> Let  LWQP3 = 3\*N+1,  LWCON = 3\*N, and let
> LWORQ = { MAX( N, 1 ),  if JOBU = 'R', 'S', or 'U'
> { MAX( M, 1 ),  if JOBU = 'A'
> LWSVD = MAX( 5\*N, 1 )
> LWLQF = MAX( N/2, 1 ), LWSVD2 = MAX( 5\*(N/2), 1 ), LWORLQ = MAX( N, 1 ),
> LWQRF = MAX( N/2, 1 ), LWORQ2 = MAX( N, 1 )
> Then the minimal value of LWORK is:
> = MAX( N + LWQP3, LWSVD )        if only the singular values are needed;
> = MAX( N + LWQP3, LWCON, LWSVD ) if only the singular values are needed,
> and a scaled condition estimate requested;
> 
> = N + MAX( LWQP3, LWSVD, LWORQ ) if the singular values and the left
> singular vectors are requested;
> = N + MAX( LWQP3, LWCON, LWSVD, LWORQ ) if the singular values and the left
> singular vectors are requested, and also
> a scaled condition estimate requested;
> 
> = N + MAX( LWQP3, LWSVD )        if the singular values and the right
> singular vectors are requested;
> = N + MAX( LWQP3, LWCON, LWSVD ) if the singular values and the right
> singular vectors are requested, and also
> a scaled condition etimate requested;
> 
> = N + MAX( LWQP3, LWSVD, LWORQ ) if the full SVD is requested with JOBV = 'R';
> independent of JOBR;
> = N + MAX( LWQP3, LWCON, LWSVD, LWORQ ) if the full SVD is requested,
> JOBV = 'R' and, also a scaled condition
> estimate requested; independent of JOBR;
> = MAX( N + MAX( LWQP3, LWSVD, LWORQ ),
> N + MAX( LWQP3, N/2+LWLQF, N/2+LWSVD2, N/2+LWORLQ, LWORQ) ) if the
> full SVD is requested with JOBV = 'A' or 'V', and
> JOBR ='N'
> = MAX( N + MAX( LWQP3, LWCON, LWSVD, LWORQ ),
> N + MAX( LWQP3, LWCON, N/2+LWLQF, N/2+LWSVD2, N/2+LWORLQ, LWORQ ) )
> if the full SVD is requested with JOBV = 'A' or 'V', and
> JOBR ='N', and also a scaled condition number estimate
> requested.
> = MAX( N + MAX( LWQP3, LWSVD, LWORQ ),
> N + MAX( LWQP3, N/2+LWQRF, N/2+LWSVD2, N/2+LWORQ2, LWORQ ) ) if the
> full SVD is requested with JOBV = 'A', 'V', and JOBR ='T'
> = MAX( N + MAX( LWQP3, LWCON, LWSVD, LWORQ ),
> N + MAX( LWQP3, LWCON, N/2+LWQRF, N/2+LWSVD2, N/2+LWORQ2, LWORQ ) )
> if the full SVD is requested with JOBV = 'A' or 'V', and
> JOBR ='T', and also a scaled condition number estimate
> requested.
> Finally, LWORK must be at least two: LWORK = MAX( 2, LWORK ).
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates and returns the optimal and minimal sizes
> for the WORK, IWORK, and RWORK arrays, and no error
> message related to LWORK is issued by XERBLA.

RWORK : DOUBLE PRECISION array, dimension (max(1, LRWORK)). [out]
> On exit,
> 1. If JOBA = 'E', RWORK(1) contains an estimate of the condition
> number of column scaled A. If A = C \* D where D is diagonal and C
> has unit columns in the Euclidean norm, then, assuming full column rank,
> N^(-1/4) \* RWORK(1) <= ||pinv(C)||_2 <= N^(1/4) \* RWORK(1).
> Otherwise, RWORK(1) = -1.
> 2. RWORK(2) contains the number of singular values computed as
> exact zeros in DGESVD applied to the upper triangular or trapezoidal
> R (from the initial QR factorization). In case of early exit (no call to
> DGESVD, such as in the case of zero matrix) RWORK(2) = -1.
> 
> If LIWORK, LWORK, or LRWORK = -1, then on exit, if INFO = 0,
> RWORK(1) returns the minimal LRWORK.

LRWORK : INTEGER. [in]
> The dimension of the array RWORK.
> If JOBP ='P', then LRWORK >= MAX(2, M).
> Otherwise, LRWORK >= 2
> 
> If LRWORK = -1, then a workspace query is assumed; the routine
> only calculates and returns the optimal and minimal sizes
> for the WORK, IWORK, and RWORK arrays, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if DBDSQR did not converge, INFO specifies how many superdiagonals
> of an intermediate bidiagonal form B (computed in DGESVD) did not
> converge to zero.
