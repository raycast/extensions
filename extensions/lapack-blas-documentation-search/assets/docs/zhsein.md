```fortran
subroutine zhsein (
        character side,
        character eigsrc,
        character initv,
        logical, dimension( * ) select,
        integer n,
        complex*16, dimension( ldh, * ) h,
        integer ldh,
        complex*16, dimension( * ) w,
        complex*16, dimension( ldvl, * ) vl,
        integer ldvl,
        complex*16, dimension( ldvr, * ) vr,
        integer ldvr,
        integer mm,
        integer m,
        complex*16, dimension( * ) work,
        double precision, dimension( * ) rwork,
        integer, dimension( * ) ifaill,
        integer, dimension( * ) ifailr,
        integer info
)
```

ZHSEIN uses inverse iteration to find specified right and/or left
eigenvectors of a complex upper Hessenberg matrix H.

The right eigenvector x and the left eigenvector y of the matrix H
corresponding to an eigenvalue w are defined by:

H \* x = w \* x,     y\*\*h \* H = w \* y\*\*h

where y\*\*h denotes the conjugate transpose of the vector y.

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'R': compute right eigenvectors only;
> = 'L': compute left eigenvectors only;
> = 'B': compute both right and left eigenvectors.

EIGSRC : CHARACTER\*1 [in]
> Specifies the source of eigenvalues supplied in W:
> = 'Q': the eigenvalues were found using ZHSEQR; thus, if
> H has zero subdiagonal elements, and so is
> block-triangular, then the j-th eigenvalue can be
> assumed to be an eigenvalue of the block containing
> the j-th row/column.  This property allows ZHSEIN to
> perform inverse iteration on just one diagonal block.
> = 'N': no assumptions are made on the correspondence
> between eigenvalues and diagonal blocks.  In this
> case, ZHSEIN must always perform inverse iteration
> using the whole matrix H.

INITV : CHARACTER\*1 [in]
> = 'N': no initial vectors are supplied;
> = 'U': user-supplied initial vectors are stored in the arrays
> VL and/or VR.

SELECT : LOGICAL array, dimension (N) [in]
> Specifies the eigenvectors to be computed. To select the
> eigenvector corresponding to the eigenvalue W(j),
> SELECT(j) must be set to .TRUE..

N : INTEGER [in]
> The order of the matrix H.  N >= 0.

H : COMPLEX\*16 array, dimension (LDH,N) [in]
> The upper Hessenberg matrix H.
> If a NaN is detected in H, the routine will return with INFO=-6.

LDH : INTEGER [in]
> The leading dimension of the array H.  LDH >= max(1,N).

W : COMPLEX\*16 array, dimension (N) [in,out]
> On entry, the eigenvalues of H.
> On exit, the real parts of W may have been altered since
> close eigenvalues are perturbed slightly in searching for
> independent eigenvectors.

VL : COMPLEX\*16 array, dimension (LDVL,MM) [in,out]
> On entry, if INITV = 'U' and SIDE = 'L' or 'B', VL must
> contain starting vectors for the inverse iteration for the
> left eigenvectors; the starting vector for each eigenvector
> must be in the same column in which the eigenvector will be
> stored.
> On exit, if SIDE = 'L' or 'B', the left eigenvectors
> specified by SELECT will be stored consecutively in the
> columns of VL, in the same order as their eigenvalues.
> If SIDE = 'R', VL is not referenced.

LDVL : INTEGER [in]
> The leading dimension of the array VL.
> LDVL >= max(1,N) if SIDE = 'L' or 'B'; LDVL >= 1 otherwise.

VR : COMPLEX\*16 array, dimension (LDVR,MM) [in,out]
> On entry, if INITV = 'U' and SIDE = 'R' or 'B', VR must
> contain starting vectors for the inverse iteration for the
> right eigenvectors; the starting vector for each eigenvector
> must be in the same column in which the eigenvector will be
> stored.
> On exit, if SIDE = 'R' or 'B', the right eigenvectors
> specified by SELECT will be stored consecutively in the
> columns of VR, in the same order as their eigenvalues.
> If SIDE = 'L', VR is not referenced.

LDVR : INTEGER [in]
> The leading dimension of the array VR.
> LDVR >= max(1,N) if SIDE = 'R' or 'B'; LDVR >= 1 otherwise.

MM : INTEGER [in]
> The number of columns in the arrays VL and/or VR. MM >= M.

M : INTEGER [out]
> The number of columns in the arrays VL and/or VR required to
> store the eigenvectors (= the number of .TRUE. elements in
> SELECT).

WORK : COMPLEX\*16 array, dimension (N\*N) [out]

RWORK : DOUBLE PRECISION array, dimension (N) [out]

IFAILL : INTEGER array, dimension (MM) [out]
> If SIDE = 'L' or 'B', IFAILL(i) = j > 0 if the left
> eigenvector in the i-th column of VL (corresponding to the
> eigenvalue w(j)) failed to converge; IFAILL(i) = 0 if the
> eigenvector converged satisfactorily.
> If SIDE = 'R', IFAILL is not referenced.

IFAILR : INTEGER array, dimension (MM) [out]
> If SIDE = 'R' or 'B', IFAILR(i) = j > 0 if the right
> eigenvector in the i-th column of VR (corresponding to the
> eigenvalue w(j)) failed to converge; IFAILR(i) = 0 if the
> eigenvector converged satisfactorily.
> If SIDE = 'L', IFAILR is not referenced.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, i is the number of eigenvectors which
> failed to converge; see IFAILL and IFAILR for further
> details.
