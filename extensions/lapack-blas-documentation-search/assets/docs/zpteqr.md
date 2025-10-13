```fortran
subroutine zpteqr (
        character compz,
        integer n,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        complex*16, dimension( ldz, * ) z,
        integer ldz,
        double precision, dimension( * ) work,
        integer info
)
```

ZPTEQR computes all eigenvalues and, optionally, eigenvectors of a
symmetric positive definite tridiagonal matrix by first factoring the
matrix using DPTTRF and then calling ZBDSQR to compute the singular
values of the bidiagonal factor.

This routine computes the eigenvalues of the positive definite
tridiagonal matrix to high relative accuracy.  This means that if the
eigenvalues range over many orders of magnitude in size, then the
small eigenvalues and corresponding eigenvectors will be computed
more accurately than, for example, with the standard QR method.

The eigenvectors of a full or band positive definite Hermitian matrix
can also be found if ZHETRD, ZHPTRD, or ZHBTRD has been used to
reduce this matrix to tridiagonal form.  (The reduction to
tridiagonal form, however, may preclude the possibility of obtaining
high relative accuracy in the small eigenvalues of the original
matrix, if these eigenvalues range over many orders of magnitude.)

## Parameters
COMPZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only.
> = 'V':  Compute eigenvectors of original Hermitian
> matrix also.  Array Z contains the unitary matrix
> used to reduce the original matrix to tridiagonal
> form.
> = 'I':  Compute eigenvectors of tridiagonal matrix also.

N : INTEGER [in]
> The order of the matrix.  N >= 0.

D : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, the n diagonal elements of the tridiagonal matrix.
> On normal exit, D contains the eigenvalues, in descending
> order.

E : DOUBLE PRECISION array, dimension (N-1) [in,out]
> On entry, the (n-1) subdiagonal elements of the tridiagonal
> matrix.
> On exit, E has been destroyed.

Z : COMPLEX\*16 array, dimension (LDZ, N) [in,out]
> On entry, if COMPZ = 'V', the unitary matrix used in the
> reduction to tridiagonal form.
> On exit, if COMPZ = 'V', the orthonormal eigenvectors of the
> original Hermitian matrix;
> if COMPZ = 'I', the orthonormal eigenvectors of the
> tridiagonal matrix.
> If INFO > 0 on exit, Z contains the eigenvectors associated
> with only the stored eigenvalues.
> If  COMPZ = 'N', then Z is not referenced.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= 1, and if
> COMPZ = 'V' or 'I', LDZ >= max(1,N).

WORK : DOUBLE PRECISION array, dimension (4\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = i, and i is:
> <= N  the Cholesky factorization of the matrix could
> not be performed because the leading principal
> minor of order i was not positive.
> > N   the SVD algorithm failed to converge;
> if INFO = N+i, i off-diagonal elements of the
> bidiagonal factor did not converge to zero.
