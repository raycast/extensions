```fortran
subroutine sspgvx (
        integer itype,
        character jobz,
        character range,
        character uplo,
        integer n,
        real, dimension( * ) ap,
        real, dimension( * ) bp,
        real vl,
        real vu,
        integer il,
        integer iu,
        real abstol,
        integer m,
        real, dimension( * ) w,
        real, dimension( ldz, * ) z,
        integer ldz,
        real, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer, dimension( * ) ifail,
        integer info
)
```

SSPGVX computes selected eigenvalues, and optionally, eigenvectors
of a real generalized symmetric-definite eigenproblem, of the form
A\*x=(lambda)\*B\*x,  A\*Bx=(lambda)\*x,  or B\*A\*x=(lambda)\*x.  Here A
and B are assumed to be symmetric, stored in packed storage, and B
is also positive definite.  Eigenvalues and eigenvectors can be
selected by specifying either a range of values or a range of indices
for the desired eigenvalues.

## Parameters
ITYPE : INTEGER [in]
> Specifies the problem type to be solved:
> = 1:  A\*x = (lambda)\*B\*x
> = 2:  A\*B\*x = (lambda)\*x
> = 3:  B\*A\*x = (lambda)\*x

JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only;
> = 'V':  Compute eigenvalues and eigenvectors.

RANGE : CHARACTER\*1 [in]
> = 'A': all eigenvalues will be found.
> = 'V': all eigenvalues in the half-open interval (VL,VU]
> will be found.
> = 'I': the IL-th through IU-th eigenvalues will be found.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A and B are stored;
> = 'L':  Lower triangle of A and B are stored.

N : INTEGER [in]
> The order of the matrix pencil (A,B).  N >= 0.

AP : REAL array, dimension (N\*(N+1)/2) [in,out]
> On entry, the upper or lower triangle of the symmetric matrix
> A, packed columnwise in a linear array.  The j-th column of A
> is stored in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2\*n-j)/2) = A(i,j) for j<=i<=n.
> 
> On exit, the contents of AP are destroyed.

BP : REAL array, dimension (N\*(N+1)/2) [in,out]
> On entry, the upper or lower triangle of the symmetric matrix
> B, packed columnwise in a linear array.  The j-th column of B
> is stored in the array BP as follows:
> if UPLO = 'U', BP(i + (j-1)\*j/2) = B(i,j) for 1<=i<=j;
> if UPLO = 'L', BP(i + (j-1)\*(2\*n-j)/2) = B(i,j) for j<=i<=n.
> 
> On exit, the triangular factor U or L from the Cholesky
> factorization B = U\*\*T\*U or B = L\*L\*\*T, in the same storage
> format as B.

VL : REAL [in]
> 
> If RANGE='V', the lower bound of the interval to
> be searched for eigenvalues. VL < VU.
> Not referenced if RANGE = 'A' or 'I'.

VU : REAL [in]
> 
> If RANGE='V', the upper bound of the interval to
> be searched for eigenvalues. VL < VU.
> Not referenced if RANGE = 'A' or 'I'.

IL : INTEGER [in]
> 
> If RANGE='I', the index of the
> smallest eigenvalue to be returned.
> 1 <= IL <= IU <= N, if N > 0; IL = 1 and IU = 0 if N = 0.
> Not referenced if RANGE = 'A' or 'V'.

IU : INTEGER [in]
> 
> If RANGE='I', the index of the
> largest eigenvalue to be returned.
> 1 <= IL <= IU <= N, if N > 0; IL = 1 and IU = 0 if N = 0.
> Not referenced if RANGE = 'A' or 'V'.

ABSTOL : REAL [in]
> The absolute error tolerance for the eigenvalues.
> An approximate eigenvalue is accepted as converged
> when it is determined to lie in an interval [a,b]
> of width less than or equal to
> 
> ABSTOL + EPS \*   max( |a|,|b| ) ,
> 
> where EPS is the machine precision.  If ABSTOL is less than
> or equal to zero, then  EPS\*|T|  will be used in its place,
> where |T| is the 1-norm of the tridiagonal matrix obtained
> by reducing A to tridiagonal form.
> 
> Eigenvalues will be computed most accurately when ABSTOL is
> set to twice the underflow threshold 2\*SLAMCH('S'), not zero.
> If this routine returns with INFO>0, indicating that some
> eigenvectors did not converge, try setting ABSTOL to
> 2\*SLAMCH('S').

M : INTEGER [out]
> The total number of eigenvalues found.  0 <= M <= N.
> If RANGE = 'A', M = N, and if RANGE = 'I', M = IU-IL+1.

W : REAL array, dimension (N) [out]
> On normal exit, the first M elements contain the selected
> eigenvalues in ascending order.

Z : REAL array, dimension (LDZ, max(1,M)) [out]
> If JOBZ = 'N', then Z is not referenced.
> If JOBZ = 'V', then if INFO = 0, the first M columns of Z
> contain the orthonormal eigenvectors of the matrix A
> corresponding to the selected eigenvalues, with the i-th
> column of Z holding the eigenvector associated with W(i).
> The eigenvectors are normalized as follows:
> if ITYPE = 1 or 2, Z\*\*T\*B\*Z = I;
> if ITYPE = 3, Z\*\*T\*inv(B)\*Z = I.
> 
> If an eigenvector fails to converge, then that column of Z
> contains the latest approximation to the eigenvector, and the
> index of the eigenvector is returned in IFAIL.
> Note: the user must ensure that at least max(1,M) columns are
> supplied in the array Z; if RANGE = 'V', the exact value of M
> is not known in advance and an upper bound must be used.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= 1, and if
> JOBZ = 'V', LDZ >= max(1,N).

WORK : REAL array, dimension (8\*N) [out]

IWORK : INTEGER array, dimension (5\*N) [out]

IFAIL : INTEGER array, dimension (N) [out]
> If JOBZ = 'V', then if INFO = 0, the first M elements of
> IFAIL are zero.  If INFO > 0, then IFAIL contains the
> indices of the eigenvectors that failed to converge.
> If JOBZ = 'N', then IFAIL is not referenced.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  SPPTRF or SSPEVX returned an error code:
> <= N:  if INFO = i, SSPEVX failed to converge;
> i eigenvectors failed to converge.  Their indices
> are stored in array IFAIL.
> > N:   if INFO = N + i, for 1 <= i <= N, then the leading
> principal minor of order i of B is not positive.
> The factorization of B could not be completed and
> no eigenvalues or eigenvectors were computed.
