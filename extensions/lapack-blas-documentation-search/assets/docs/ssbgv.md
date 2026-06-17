```fortran
subroutine ssbgv (
        character jobz,
        character uplo,
        integer n,
        integer ka,
        integer kb,
        real, dimension( ldab, * ) ab,
        integer ldab,
        real, dimension( ldbb, * ) bb,
        integer ldbb,
        real, dimension( * ) w,
        real, dimension( ldz, * ) z,
        integer ldz,
        real, dimension( * ) work,
        integer info
)
```

SSBGV computes all the eigenvalues, and optionally, the eigenvectors
of a real generalized symmetric-definite banded eigenproblem, of
the form A\*x=(lambda)\*B\*x. Here A and B are assumed to be symmetric
and banded, and B is also positive definite.

## Parameters
JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only;
> = 'V':  Compute eigenvalues and eigenvectors.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangles of A and B are stored;
> = 'L':  Lower triangles of A and B are stored.

N : INTEGER [in]
> The order of the matrices A and B.  N >= 0.

KA : INTEGER [in]
> The number of superdiagonals of the matrix A if UPLO = 'U',
> or the number of subdiagonals if UPLO = 'L'. KA >= 0.

KB : INTEGER [in]
> The number of superdiagonals of the matrix B if UPLO = 'U',
> or the number of subdiagonals if UPLO = 'L'. KB >= 0.

AB : REAL array, dimension (LDAB, N) [in,out]
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

BB : REAL array, dimension (LDBB, N) [in,out]
> On entry, the upper or lower triangle of the symmetric band
> matrix B, stored in the first kb+1 rows of the array.  The
> j-th column of B is stored in the j-th column of the array BB
> as follows:
> if UPLO = 'U', BB(kb+1+i-j,j) = B(i,j) for max(1,j-kb)<=i<=j;
> if UPLO = 'L', BB(1+i-j,j)    = B(i,j) for j<=i<=min(n,j+kb).
> 
> On exit, the factor S from the split Cholesky factorization
> B = S\*\*T\*S, as returned by SPBSTF.

LDBB : INTEGER [in]
> The leading dimension of the array BB.  LDBB >= KB+1.

W : REAL array, dimension (N) [out]
> If INFO = 0, the eigenvalues in ascending order.

Z : REAL array, dimension (LDZ, N) [out]
> If JOBZ = 'V', then if INFO = 0, Z contains the matrix Z of
> eigenvectors, with the i-th column of Z holding the
> eigenvector associated with W(i). The eigenvectors are
> normalized so that Z\*\*T\*B\*Z = I.
> If JOBZ = 'N', then Z is not referenced.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= 1, and if
> JOBZ = 'V', LDZ >= N.

WORK : REAL array, dimension (3\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, and i is:
> <= N:  the algorithm failed to converge:
> i off-diagonal elements of an intermediate
> tridiagonal form did not converge to zero;
> > N:   if INFO = N + i, for 1 <= i <= N, then SPBSTF
> returned INFO = i: B is not positive definite.
> The factorization of B could not be completed and
> no eigenvalues or eigenvectors were computed.
