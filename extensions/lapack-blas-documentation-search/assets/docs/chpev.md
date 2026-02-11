```fortran
subroutine chpev (
        character jobz,
        character uplo,
        integer n,
        complex, dimension( * ) ap,
        real, dimension( * ) w,
        complex, dimension( ldz, * ) z,
        integer ldz,
        complex, dimension( * ) work,
        real, dimension( * ) rwork,
        integer info
)
```

CHPEV computes all the eigenvalues and, optionally, eigenvectors of a
complex Hermitian matrix in packed storage.

## Parameters
JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only;
> = 'V':  Compute eigenvalues and eigenvectors.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

AP : COMPLEX array, dimension (N\*(N+1)/2) [in,out]
> On entry, the upper or lower triangle of the Hermitian matrix
> A, packed columnwise in a linear array.  The j-th column of A
> is stored in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2\*n-j)/2) = A(i,j) for j<=i<=n.
> 
> On exit, AP is overwritten by values generated during the
> reduction to tridiagonal form.  If UPLO = 'U', the diagonal
> and first superdiagonal of the tridiagonal matrix T overwrite
> the corresponding elements of A, and if UPLO = 'L', the
> diagonal and first subdiagonal of T overwrite the
> corresponding elements of A.

W : REAL array, dimension (N) [out]
> If INFO = 0, the eigenvalues in ascending order.

Z : COMPLEX array, dimension (LDZ, N) [out]
> If JOBZ = 'V', then if INFO = 0, Z contains the orthonormal
> eigenvectors of the matrix A, with the i-th column of Z
> holding the eigenvector associated with W(i).
> If JOBZ = 'N', then Z is not referenced.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= 1, and if
> JOBZ = 'V', LDZ >= max(1,N).

WORK : COMPLEX array, dimension (max(1, 2\*N-1)) [out]

RWORK : REAL array, dimension (max(1, 3\*N-2)) [out]

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = i, the algorithm failed to converge; i
> off-diagonal elements of an intermediate tridiagonal
> form did not converge to zero.
