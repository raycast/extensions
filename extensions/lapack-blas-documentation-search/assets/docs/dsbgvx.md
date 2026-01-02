```fortran
subroutine dsbgvx (
        character jobz,
        character range,
        character uplo,
        integer n,
        integer ka,
        integer kb,
        double precision, dimension( ldab, * ) ab,
        integer ldab,
        double precision, dimension( ldbb, * ) bb,
        integer ldbb,
        double precision, dimension( ldq, * ) q,
        integer ldq,
        double precision vl,
        double precision vu,
        integer il,
        integer iu,
        double precision abstol,
        integer m,
        double precision, dimension( * ) w,
        double precision, dimension( ldz, * ) z,
        integer ldz,
        double precision, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer, dimension( * ) ifail,
        integer info
)
```

DSBGVX computes selected eigenvalues, and optionally, eigenvectors
of a real generalized symmetric-definite banded eigenproblem, of
the form A\*x=(lambda)\*B\*x.  Here A and B are assumed to be symmetric
and banded, and B is also positive definite.  Eigenvalues and
eigenvectors can be selected by specifying either all eigenvalues,
a range of values or a range of indices for the desired eigenvalues.

## Parameters
JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only;
> = 'V':  Compute eigenvalues and eigenvectors.

RANGE : CHARACTER\*1 [in]
> = 'A': all eigenvalues will be found.
> = 'V': all eigenvalues in the half-open interval (VL,VU]
> will be found.
> = 'I': the IL-th through IU-th eigenvalues will be found.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangles of A and B are stored;
> = 'L':  Lower triangles of A and B are stored.

N : INTEGER [in]
> The order of the matrices A and B.  N >= 0.

KA : INTEGER [in]
> The number of superdiagonals of the matrix A if UPLO = 'U',
> or the number of subdiagonals if UPLO = 'L'.  KA >= 0.

KB : INTEGER [in]
> The number of superdiagonals of the matrix B if UPLO = 'U',
> or the number of subdiagonals if UPLO = 'L'.  KB >= 0.

AB : DOUBLE PRECISION array, dimension (LDAB, N) [in,out]
> On entry, the upper or lower triangle of the symmetric band
> matrix A, stored in the first ka+1 rows of the array.  The
> j-th column of A is stored in the j-th column of the array AB
> as follows:
> if UPLO = 'U', AB(ka+1+i-j,j) = A(i,j) for max(1,j-ka)<=i<=j;
> if UPLO = 'L', AB(1+i-j,j)    = A(i,j) for j<=i<=min(n,j+ka).
> 
> On exit, the contents of AB are destroyed.

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KA+1.

BB : DOUBLE PRECISION array, dimension (LDBB, N) [in,out]
> On entry, the upper or lower triangle of the symmetric band
> matrix B, stored in the first kb+1 rows of the array.  The
> j-th column of B is stored in the j-th column of the array BB
> as follows:
> if UPLO = 'U', BB(ka+1+i-j,j) = B(i,j) for max(1,j-kb)<=i<=j;
> if UPLO = 'L', BB(1+i-j,j)    = B(i,j) for j<=i<=min(n,j+kb).
> 
> On exit, the factor S from the split Cholesky factorization
> B = S\*\*T\*S, as returned by DPBSTF.

LDBB : INTEGER [in]
> The leading dimension of the array BB.  LDBB >= KB+1.

Q : DOUBLE PRECISION array, dimension (LDQ, N) [out]
> If JOBZ = 'V', the n-by-n matrix used in the reduction of
> A\*x = (lambda)\*B\*x to standard form, i.e. C\*x = (lambda)\*x,
> and consequently C to tridiagonal form.
> If JOBZ = 'N', the array Q is not referenced.

LDQ : INTEGER [in]
> The leading dimension of the array Q.  If JOBZ = 'N',
> LDQ >= 1. If JOBZ = 'V', LDQ >= max(1,N).

VL : DOUBLE PRECISION [in]
> 
> If RANGE='V', the lower bound of the interval to
> be searched for eigenvalues. VL < VU.
> Not referenced if RANGE = 'A' or 'I'.

VU : DOUBLE PRECISION [in]
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

ABSTOL : DOUBLE PRECISION [in]
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
> set to twice the underflow threshold 2\*DLAMCH('S'), not zero.
> If this routine returns with INFO>0, indicating that some
> eigenvectors did not converge, try setting ABSTOL to
> 2\*DLAMCH('S').

M : INTEGER [out]
> The total number of eigenvalues found.  0 <= M <= N.
> If RANGE = 'A', M = N, and if RANGE = 'I', M = IU-IL+1.

W : DOUBLE PRECISION array, dimension (N) [out]
> If INFO = 0, the eigenvalues in ascending order.

Z : DOUBLE PRECISION array, dimension (LDZ, N) [out]
> If JOBZ = 'V', then if INFO = 0, Z contains the matrix Z of
> eigenvectors, with the i-th column of Z holding the
> eigenvector associated with W(i).  The eigenvectors are
> normalized so Z\*\*T\*B\*Z = I.
> If JOBZ = 'N', then Z is not referenced.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= 1, and if
> JOBZ = 'V', LDZ >= max(1,N).

WORK : DOUBLE PRECISION array, dimension (7\*N) [out]

IWORK : INTEGER array, dimension (5\*N) [out]

IFAIL : INTEGER array, dimension (M) [out]
> If JOBZ = 'V', then if INFO = 0, the first M elements of
> IFAIL are zero.  If INFO > 0, then IFAIL contains the
> indices of the eigenvalues that failed to converge.
> If JOBZ = 'N', then IFAIL is not referenced.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> <= N: if INFO = i, then i eigenvectors failed to converge.
> Their indices are stored in IFAIL.
> > N:  DPBSTF returned an error code; i.e.,
> if INFO = N + i, for 1 <= i <= N, then the leading
> principal minor of order i of B is not positive.
> The factorization of B could not be completed and
> no eigenvalues or eigenvectors were computed.
