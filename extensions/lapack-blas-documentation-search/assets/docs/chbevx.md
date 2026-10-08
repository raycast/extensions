```fortran
subroutine chbevx (
        character jobz,
        character range,
        character uplo,
        integer n,
        integer kd,
        complex, dimension( ldab, * ) ab,
        integer ldab,
        complex, dimension( ldq, * ) q,
        integer ldq,
        real vl,
        real vu,
        integer il,
        integer iu,
        real abstol,
        integer m,
        real, dimension( * ) w,
        complex, dimension( ldz, * ) z,
        integer ldz,
        complex, dimension( * ) work,
        real, dimension( * ) rwork,
        integer, dimension( * ) iwork,
        integer, dimension( * ) ifail,
        integer info
)
```

CHBEVX computes selected eigenvalues and, optionally, eigenvectors
of a complex Hermitian band matrix A.  Eigenvalues and eigenvectors
can be selected by specifying either a range of values or a range of
indices for the desired eigenvalues.

## Parameters
JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only;
> = 'V':  Compute eigenvalues and eigenvectors.

RANGE : CHARACTER\*1 [in]
> = 'A': all eigenvalues will be found;
> = 'V': all eigenvalues in the half-open interval (VL,VU]
> will be found;
> = 'I': the IL-th through IU-th eigenvalues will be found.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

KD : INTEGER [in]
> The number of superdiagonals of the matrix A if UPLO = 'U',
> or the number of subdiagonals if UPLO = 'L'.  KD >= 0.

AB : COMPLEX array, dimension (LDAB, N) [in,out]
> On entry, the upper or lower triangle of the Hermitian band
> matrix A, stored in the first KD+1 rows of the array.  The
> j-th column of A is stored in the j-th column of the array AB
> as follows:
> if UPLO = 'U', AB(kd+1+i-j,j) = A(i,j) for max(1,j-kd)<=i<=j;
> if UPLO = 'L', AB(1+i-j,j)    = A(i,j) for j<=i<=min(n,j+kd).
> 
> On exit, AB is overwritten by values generated during the
> reduction to tridiagonal form.

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KD + 1.

Q : COMPLEX array, dimension (LDQ, N) [out]
> If JOBZ = 'V', the N-by-N unitary matrix used in the
> reduction to tridiagonal form.
> If JOBZ = 'N', the array Q is not referenced.

LDQ : INTEGER [in]
> The leading dimension of the array Q.  If JOBZ = 'V', then
> LDQ >= max(1,N).

VL : REAL [in]
> If RANGE='V', the lower bound of the interval to
> be searched for eigenvalues. VL < VU.
> Not referenced if RANGE = 'A' or 'I'.

VU : REAL [in]
> If RANGE='V', the upper bound of the interval to
> be searched for eigenvalues. VL < VU.
> Not referenced if RANGE = 'A' or 'I'.

IL : INTEGER [in]
> If RANGE='I', the index of the
> smallest eigenvalue to be returned.
> 1 <= IL <= IU <= N, if N > 0; IL = 1 and IU = 0 if N = 0.
> Not referenced if RANGE = 'A' or 'V'.

IU : INTEGER [in]
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
> by reducing AB to tridiagonal form.
> 
> Eigenvalues will be computed most accurately when ABSTOL is
> set to twice the underflow threshold 2\*SLAMCH('S'), not zero.
> If this routine returns with INFO>0, indicating that some
> eigenvectors did not converge, try setting ABSTOL to
> 2\*SLAMCH('S').
> 
> See  by Demmel and
> Kahan, LAPACK Working Note #3.

M : INTEGER [out]
> The total number of eigenvalues found.  0 <= M <= N.
> If RANGE = 'A', M = N, and if RANGE = 'I', M = IU-IL+1.

W : REAL array, dimension (N) [out]
> The first M elements contain the selected eigenvalues in
> ascending order.

Z : COMPLEX array, dimension (LDZ, max(1,M)) [out]
> If JOBZ = 'V', then if INFO = 0, the first M columns of Z
> contain the orthonormal eigenvectors of the matrix A
> corresponding to the selected eigenvalues, with the i-th
> column of Z holding the eigenvector associated with W(i).
> If an eigenvector fails to converge, then that column of Z
> contains the latest approximation to the eigenvector, and the
> index of the eigenvector is returned in IFAIL.
> If JOBZ = 'N', then Z is not referenced.
> Note: the user must ensure that at least max(1,M) columns are
> supplied in the array Z; if RANGE = 'V', the exact value of M
> is not known in advance and an upper bound must be used.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= 1, and if
> JOBZ = 'V', LDZ >= max(1,N).

WORK : COMPLEX array, dimension (N) [out]

RWORK : REAL array, dimension (7\*N) [out]

IWORK : INTEGER array, dimension (5\*N) [out]

IFAIL : INTEGER array, dimension (N) [out]
> If JOBZ = 'V', then if INFO = 0, the first M elements of
> IFAIL are zero.  If INFO > 0, then IFAIL contains the
> indices of the eigenvectors that failed to converge.
> If JOBZ = 'N', then IFAIL is not referenced.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, then i eigenvectors failed to converge.
> Their indices are stored in array IFAIL.
