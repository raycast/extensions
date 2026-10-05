```fortran
subroutine sstein (
        integer n,
        real, dimension( * ) d,
        real, dimension( * ) e,
        integer m,
        real, dimension( * ) w,
        integer, dimension( * ) iblock,
        integer, dimension( * ) isplit,
        real, dimension( ldz, * ) z,
        integer ldz,
        real, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer, dimension( * ) ifail,
        integer info
)
```

SSTEIN computes the eigenvectors of a real symmetric tridiagonal
matrix T corresponding to specified eigenvalues, using inverse
iteration.

The maximum number of iterations allowed for each eigenvector is
specified by an internal parameter MAXITS (currently set to 5).

## Parameters
N : INTEGER [in]
> The order of the matrix.  N >= 0.

D : REAL array, dimension (N) [in]
> The n diagonal elements of the tridiagonal matrix T.

E : REAL array, dimension (N-1) [in]
> The (n-1) subdiagonal elements of the tridiagonal matrix
> T, in elements 1 to N-1.

M : INTEGER [in]
> The number of eigenvectors to be found.  0 <= M <= N.

W : REAL array, dimension (N) [in]
> The first M elements of W contain the eigenvalues for
> which eigenvectors are to be computed.  The eigenvalues
> should be grouped by split-off block and ordered from
> smallest to largest within the block.  ( The output array
> W from SSTEBZ with ORDER = 'B' is expected here. )

IBLOCK : INTEGER array, dimension (N) [in]
> The submatrix indices associated with the corresponding
> eigenvalues in W; IBLOCK(i)=1 if eigenvalue W(i) belongs to
> the first submatrix from the top, =2 if W(i) belongs to
> the second submatrix, etc.  ( The output array IBLOCK
> from SSTEBZ is expected here. )

ISPLIT : INTEGER array, dimension (N) [in]
> The splitting points, at which T breaks up into submatrices.
> The first submatrix consists of rows/columns 1 to
> ISPLIT( 1 ), the second of rows/columns ISPLIT( 1 )+1
> through ISPLIT( 2 ), etc.
> ( The output array ISPLIT from SSTEBZ is expected here. )

Z : REAL array, dimension (LDZ, M) [out]
> The computed eigenvectors.  The eigenvector associated
> with the eigenvalue W(i) is stored in the i-th column of
> Z.  Any vector which fails to converge is set to its current
> iterate after MAXITS iterations.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= max(1,N).

WORK : REAL array, dimension (5\*N) [out]

IWORK : INTEGER array, dimension (N) [out]

IFAIL : INTEGER array, dimension (M) [out]
> On normal exit, all elements of IFAIL are zero.
> If one or more eigenvectors fail to converge after
> MAXITS iterations, then their indices are stored in
> array IFAIL.

INFO : INTEGER [out]
> = 0: successful exit.
> < 0: if INFO = -i, the i-th argument had an illegal value
> > 0: if INFO = i, then i eigenvectors failed to converge
> in MAXITS iterations.  Their indices are stored in
> array IFAIL.
