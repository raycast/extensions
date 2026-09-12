```fortran
subroutine sggevx (
        character balanc,
        character jobvl,
        character jobvr,
        character sense,
        integer n,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( * ) alphar,
        real, dimension( * ) alphai,
        real, dimension( * ) beta,
        real, dimension( ldvl, * ) vl,
        integer ldvl,
        real, dimension( ldvr, * ) vr,
        integer ldvr,
        integer ilo,
        integer ihi,
        real, dimension( * ) lscale,
        real, dimension( * ) rscale,
        real abnrm,
        real bbnrm,
        real, dimension( * ) rconde,
        real, dimension( * ) rcondv,
        real, dimension( * ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        logical, dimension( * ) bwork,
        integer info
)
```

SGGEVX computes for a pair of N-by-N real nonsymmetric matrices (A,B)
the generalized eigenvalues, and optionally, the left and/or right
generalized eigenvectors.

Optionally also, it computes a balancing transformation to improve
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
> Specifies the balance option to be performed.
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

A : REAL array, dimension (LDA, N) [in,out]
> On entry, the matrix A in the pair (A,B).
> On exit, A has been overwritten. If JOBVL='V' or JOBVR='V'
> or both, then A contains the first part of the real Schur
> form of the  versions of the input A and B.

LDA : INTEGER [in]
> The leading dimension of A.  LDA >= max(1,N).

B : REAL array, dimension (LDB, N) [in,out]
> On entry, the matrix B in the pair (A,B).
> On exit, B has been overwritten. If JOBVL='V' or JOBVR='V'
> or both, then B contains the second part of the real Schur
> form of the  versions of the input A and B.

LDB : INTEGER [in]
> The leading dimension of B.  LDB >= max(1,N).

ALPHAR : REAL array, dimension (N) [out]

ALPHAI : REAL array, dimension (N) [out]

BETA : REAL array, dimension (N) [out]
> On exit, (ALPHAR(j) + ALPHAI(j)\*i)/BETA(j), j=1,...,N, will
> be the generalized eigenvalues.  If ALPHAI(j) is zero, then
> the j-th eigenvalue is real; if positive, then the j-th and
> (j+1)-st eigenvalues are a complex conjugate pair, with
> ALPHAI(j+1) negative.
> 
> Note: the quotients ALPHAR(j)/BETA(j) and ALPHAI(j)/BETA(j)
> may easily over- or underflow, and BETA(j) may even be zero.
> Thus, the user should avoid naively computing the ratio
> ALPHA/BETA. However, ALPHAR and ALPHAI will be always less
> than and usually comparable with norm(A) in magnitude, and
> BETA always less than and usually comparable with norm(B).

VL : REAL array, dimension (LDVL,N) [out]
> If JOBVL = 'V', the left eigenvectors u(j) are stored one
> after another in the columns of VL, in the same order as
> their eigenvalues. If the j-th eigenvalue is real, then
> u(j) = VL(:,j), the j-th column of VL. If the j-th and
> (j+1)-th eigenvalues form a complex conjugate pair, then
> u(j) = VL(:,j)+i\*VL(:,j+1) and u(j+1) = VL(:,j)-i\*VL(:,j+1).
> Each eigenvector will be scaled so the largest component have
> abs(real part) + abs(imag. part) = 1.
> Not referenced if JOBVL = 'N'.

LDVL : INTEGER [in]
> The leading dimension of the matrix VL. LDVL >= 1, and
> if JOBVL = 'V', LDVL >= N.

VR : REAL array, dimension (LDVR,N) [out]
> If JOBVR = 'V', the right eigenvectors v(j) are stored one
> after another in the columns of VR, in the same order as
> their eigenvalues. If the j-th eigenvalue is real, then
> v(j) = VR(:,j), the j-th column of VR. If the j-th and
> (j+1)-th eigenvalues form a complex conjugate pair, then
> v(j) = VR(:,j)+i\*VR(:,j+1) and v(j+1) = VR(:,j)-i\*VR(:,j+1).
> Each eigenvector will be scaled so the largest component have
> abs(real part) + abs(imag. part) = 1.
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

LSCALE : REAL array, dimension (N) [out]
> Details of the permutations and scaling factors applied
> to the left side of A and B.  If PL(j) is the index of the
> row interchanged with row j, and DL(j) is the scaling
> factor applied to row j, then
> LSCALE(j) = PL(j)  for j = 1,...,ILO-1
> = DL(j)  for j = ILO,...,IHI
> = PL(j)  for j = IHI+1,...,N.
> The order in which the interchanges are made is N to IHI+1,
> then 1 to ILO-1.

RSCALE : REAL array, dimension (N) [out]
> Details of the permutations and scaling factors applied
> to the right side of A and B.  If PR(j) is the index of the
> column interchanged with column j, and DR(j) is the scaling
> factor applied to column j, then
> RSCALE(j) = PR(j)  for j = 1,...,ILO-1
> = DR(j)  for j = ILO,...,IHI
> = PR(j)  for j = IHI+1,...,N
> The order in which the interchanges are made is N to IHI+1,
> then 1 to ILO-1.

ABNRM : REAL [out]
> The one-norm of the balanced matrix A.

BBNRM : REAL [out]
> The one-norm of the balanced matrix B.

RCONDE : REAL array, dimension (N) [out]
> If SENSE = 'E' or 'B', the reciprocal condition numbers of
> the eigenvalues, stored in consecutive elements of the array.
> For a complex conjugate pair of eigenvalues two consecutive
> elements of RCONDE are set to the same value. Thus RCONDE(j),
> RCONDV(j), and the j-th columns of VL and VR all correspond
> to the j-th eigenpair.
> If SENSE = 'N' or 'V', RCONDE is not referenced.

RCONDV : REAL array, dimension (N) [out]
> If SENSE = 'V' or 'B', the estimated reciprocal condition
> numbers of the eigenvectors, stored in consecutive elements
> of the array. For a complex eigenvector two consecutive
> elements of RCONDV are set to the same value. If the
> eigenvalues cannot be reordered to compute RCONDV(j),
> RCONDV(j) is set to 0; this can only occur when the true
> value would be very small anyway.
> If SENSE = 'N' or 'E', RCONDV is not referenced.

WORK : REAL array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= max(1,2\*N).
> If BALANC = 'S' or 'B', or JOBVL = 'V', or JOBVR = 'V',
> LWORK >= max(1,6\*N).
> If SENSE = 'E', LWORK >= max(1,10\*N).
> If SENSE = 'V' or 'B', LWORK >= 2\*N\*N+8\*N+16.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

IWORK : INTEGER array, dimension (N+6) [out]
> If SENSE = 'E', IWORK is not referenced.

BWORK : LOGICAL array, dimension (N) [out]
> If SENSE = 'N', BWORK is not referenced.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> = 1,...,N:
> The QZ iteration failed.  No eigenvectors have been
> calculated, but ALPHAR(j), ALPHAI(j), and BETA(j)
> should be correct for j=INFO+1,...,N.
> > N:  =N+1: other than QZ iteration failed in SHGEQZ.
> =N+2: error return from STGEVC.
