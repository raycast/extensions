```fortran
subroutine zggevx (
        character balanc,
        character jobvl,
        character jobvr,
        character sense,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( ldb, * ) b,
        integer ldb,
        complex*16, dimension( * ) alpha,
        complex*16, dimension( * ) beta,
        complex*16, dimension( ldvl, * ) vl,
        integer ldvl,
        complex*16, dimension( ldvr, * ) vr,
        integer ldvr,
        integer ilo,
        integer ihi,
        double precision, dimension( * ) lscale,
        double precision, dimension( * ) rscale,
        double precision abnrm,
        double precision bbnrm,
        double precision, dimension( * ) rconde,
        double precision, dimension( * ) rcondv,
        complex*16, dimension( * ) work,
        integer lwork,
        double precision, dimension( * ) rwork,
        integer, dimension( * ) iwork,
        logical, dimension( * ) bwork,
        integer info
)
```

ZGGEVX computes for a pair of N-by-N complex nonsymmetric matrices
(A,B) the generalized eigenvalues, and optionally, the left and/or
right generalized eigenvectors.

Optionally, it also computes a balancing transformation to improve
the conditioning of the eigenvalues and eigenvectors (ILO, IHI,
LSCALE, RSCALE, ABNRM, and BBNRM), reciprocal condition numbers for
the eigenvalues (RCONDE), and reciprocal condition numbers for the
right eigenvectors (RCONDV).

A generalized eigenvalue for a pair of matrices (A,B) is a scalar
lambda or a ratio alpha/beta = lambda, such that A - lambda\*B is
singular. It is usually represented as the pair (alpha,beta), as
there is a reasonable interpretation for beta=0, and even for both
being zero.

The right eigenvector v(j) corresponding to the eigenvalue lambda(j)
of (A,B) satisfies
A \* v(j) = lambda(j) \* B \* v(j) .
The left eigenvector u(j) corresponding to the eigenvalue lambda(j)
of (A,B) satisfies
u(j)\*\*H \* A  = lambda(j) \* u(j)\*\*H \* B.
where u(j)\*\*H is the conjugate-transpose of u(j).

## Parameters
BALANC : CHARACTER\*1 [in]
> Specifies the balance option to be performed:
> = 'N':  do not diagonally scale or permute;
> = 'P':  permute only;
> = 'S':  scale only;
> = 'B':  both permute and scale.
> Computed reciprocal condition numbers will be for the
> matrices after permuting and/or balancing. Permuting does
> not change condition numbers (in exact arithmetic), but
> balancing does.

JOBVL : CHARACTER\*1 [in]
> = 'N':  do not compute the left generalized eigenvectors;
> = 'V':  compute the left generalized eigenvectors.

JOBVR : CHARACTER\*1 [in]
> = 'N':  do not compute the right generalized eigenvectors;
> = 'V':  compute the right generalized eigenvectors.

SENSE : CHARACTER\*1 [in]
> Determines which reciprocal condition numbers are computed.
> = 'N': none are computed;
> = 'E': computed for eigenvalues only;
> = 'V': computed for eigenvectors only;
> = 'B': computed for eigenvalues and eigenvectors.

N : INTEGER [in]
> The order of the matrices A, B, VL, and VR.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA, N) [in,out]
> On entry, the matrix A in the pair (A,B).
> On exit, A has been overwritten. If JOBVL='V' or JOBVR='V'
> or both, then A contains the first part of the complex Schur
> form of the  versions of the input A and B.

LDA : INTEGER [in]
> The leading dimension of A.  LDA >= max(1,N).

B : COMPLEX\*16 array, dimension (LDB, N) [in,out]
> On entry, the matrix B in the pair (A,B).
> On exit, B has been overwritten. If JOBVL='V' or JOBVR='V'
> or both, then B contains the second part of the complex
> Schur form of the  versions of the input A and B.

LDB : INTEGER [in]
> The leading dimension of B.  LDB >= max(1,N).

ALPHA : COMPLEX\*16 array, dimension (N) [out]

BETA : COMPLEX\*16 array, dimension (N) [out]
> On exit, ALPHA(j)/BETA(j), j=1,...,N, will be the generalized
> eigenvalues.
> 
> Note: the quotient ALPHA(j)/BETA(j) ) may easily over- or
> underflow, and BETA(j) may even be zero.  Thus, the user
> should avoid naively computing the ratio ALPHA/BETA.
> However, ALPHA will be always less than and usually
> comparable with norm(A) in magnitude, and BETA always less
> than and usually comparable with norm(B).

VL : COMPLEX\*16 array, dimension (LDVL,N) [out]
> If JOBVL = 'V', the left generalized eigenvectors u(j) are
> stored one after another in the columns of VL, in the same
> order as their eigenvalues.
> Each eigenvector will be scaled so the largest component
> will have abs(real part) + abs(imag. part) = 1.
> Not referenced if JOBVL = 'N'.

LDVL : INTEGER [in]
> The leading dimension of the matrix VL. LDVL >= 1, and
> if JOBVL = 'V', LDVL >= N.

VR : COMPLEX\*16 array, dimension (LDVR,N) [out]
> If JOBVR = 'V', the right generalized eigenvectors v(j) are
> stored one after another in the columns of VR, in the same
> order as their eigenvalues.
> Each eigenvector will be scaled so the largest component
> will have abs(real part) + abs(imag. part) = 1.
> Not referenced if JOBVR = 'N'.

LDVR : INTEGER [in]
> The leading dimension of the matrix VR. LDVR >= 1, and
> if JOBVR = 'V', LDVR >= N.

ILO : INTEGER [out]

IHI : INTEGER [out]
> ILO and IHI are integer values such that on exit
> A(i,j) = 0 and B(i,j) = 0 if i > j and
> j = 1,...,ILO-1 or i = IHI+1,...,N.
> If BALANC = 'N' or 'S', ILO = 1 and IHI = N.

LSCALE : DOUBLE PRECISION array, dimension (N) [out]
> Details of the permutations and scaling factors applied
> to the left side of A and B.  If PL(j) is the index of the
> row interchanged with row j, and DL(j) is the scaling
> factor applied to row j, then
> LSCALE(j) = PL(j)  for j = 1,...,ILO-1
> = DL(j)  for j = ILO,...,IHI
> = PL(j)  for j = IHI+1,...,N.
> The order in which the interchanges are made is N to IHI+1,
> then 1 to ILO-1.

RSCALE : DOUBLE PRECISION array, dimension (N) [out]
> Details of the permutations and scaling factors applied
> to the right side of A and B.  If PR(j) is the index of the
> column interchanged with column j, and DR(j) is the scaling
> factor applied to column j, then
> RSCALE(j) = PR(j)  for j = 1,...,ILO-1
> = DR(j)  for j = ILO,...,IHI
> = PR(j)  for j = IHI+1,...,N
> The order in which the interchanges are made is N to IHI+1,
> then 1 to ILO-1.

ABNRM : DOUBLE PRECISION [out]
> The one-norm of the balanced matrix A.

BBNRM : DOUBLE PRECISION [out]
> The one-norm of the balanced matrix B.

RCONDE : DOUBLE PRECISION array, dimension (N) [out]
> If SENSE = 'E' or 'B', the reciprocal condition numbers of
> the eigenvalues, stored in consecutive elements of the array.
> If SENSE = 'N' or 'V', RCONDE is not referenced.

RCONDV : DOUBLE PRECISION array, dimension (N) [out]
> If JOB = 'V' or 'B', the estimated reciprocal condition
> numbers of the eigenvectors, stored in consecutive elements
> of the array. If the eigenvalues cannot be reordered to
> compute RCONDV(j), RCONDV(j) is set to 0; this can only occur
> when the true value would be very small anyway.
> If SENSE = 'N' or 'E', RCONDV is not referenced.

WORK : COMPLEX\*16 array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= max(1,2\*N).
> If SENSE = 'E', LWORK >= max(1,4\*N).
> If SENSE = 'V' or 'B', LWORK >= max(1,2\*N\*N+2\*N).
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

RWORK : DOUBLE PRECISION array, dimension (lrwork) [out]
> lrwork must be at least max(1,6\*N) if BALANC = 'S' or 'B',
> and at least max(1,2\*N) otherwise.
> Real workspace.

IWORK : INTEGER array, dimension (N+2) [out]
> If SENSE = 'E', IWORK is not referenced.

BWORK : LOGICAL array, dimension (N) [out]
> If SENSE = 'N', BWORK is not referenced.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> = 1,...,N:
> The QZ iteration failed.  No eigenvectors have been
> calculated, but ALPHA(j) and BETA(j) should be correct
> for j=INFO+1,...,N.
> > N:  =N+1: other than QZ iteration failed in ZHGEQZ.
> =N+2: error return from ZTGEVC.
