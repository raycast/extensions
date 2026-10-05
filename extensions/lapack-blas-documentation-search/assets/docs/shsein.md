```fortran
subroutine shsein (
        character side,
        character eigsrc,
        character initv,
        logical, dimension( * ) select,
        integer n,
        real, dimension( ldh, * ) h,
        integer ldh,
        real, dimension( * ) wr,
        real, dimension( * ) wi,
        real, dimension( ldvl, * ) vl,
        integer ldvl,
        real, dimension( ldvr, * ) vr,
        integer ldvr,
        integer mm,
        integer m,
        real, dimension( * ) work,
        integer, dimension( * ) ifaill,
        integer, dimension( * ) ifailr,
        integer info
)
```

SHSEIN uses inverse iteration to find specified right and/or left
eigenvectors of a real upper Hessenberg matrix H.

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
> Specifies the source of eigenvalues supplied in (WR,WI):
> = 'Q': the eigenvalues were found using SHSEQR; thus, if
> H has zero subdiagonal elements, and so is
> block-triangular, then the j-th eigenvalue can be
> assumed to be an eigenvalue of the block containing
> the j-th row/column.  This property allows SHSEIN to
> perform inverse iteration on just one diagonal block.
> = 'N': no assumptions are made on the correspondence
> between eigenvalues and diagonal blocks.  In this
> case, SHSEIN must always perform inverse iteration
> using the whole matrix H.

INITV : CHARACTER\*1 [in]
> = 'N': no initial vectors are supplied;
> = 'U': user-supplied initial vectors are stored in the arrays
> VL and/or VR.

SELECT : LOGICAL array, dimension (N) [in,out]
> Specifies the eigenvectors to be computed. To select the
> real eigenvector corresponding to a real eigenvalue WR(j),
> SELECT(j) must be set to .TRUE.. To select the complex
> eigenvector corresponding to a complex eigenvalue
> (WR(j),WI(j)), with complex conjugate (WR(j+1),WI(j+1)),
> either SELECT(j) or SELECT(j+1) or both must be set to
> .TRUE.; then on exit SELECT(j) is .TRUE. and SELECT(j+1) is
> .FALSE..

N : INTEGER [in]
> The order of the matrix H.  N >= 0.

H : REAL array, dimension (LDH,N) [in]
> The upper Hessenberg matrix H.
> If a NaN is detected in H, the routine will return with INFO=-6.

LDH : INTEGER [in]
> The leading dimension of the array H.  LDH >= max(1,N).

WR : REAL array, dimension (N) [in,out]

WI : REAL array, dimension (N) [in]
> 
> On entry, the real and imaginary parts of the eigenvalues of
> H; a complex conjugate pair of eigenvalues must be stored in
> consecutive elements of WR and WI.
> On exit, WR may have been altered since close eigenvalues
> are perturbed slightly in searching for independent
> eigenvectors.

VL : REAL array, dimension (LDVL,MM) [in,out]
> On entry, if INITV = 'U' and SIDE = 'L' or 'B', VL must
> contain starting vectors for the inverse iteration for the
> left eigenvectors; the starting vector for each eigenvector
> must be in the same column(s) in which the eigenvector will
> be stored.
> On exit, if SIDE = 'L' or 'B', the left eigenvectors
> specified by SELECT will be stored consecutively in the
> columns of VL, in the same order as their eigenvalues. A
> complex eigenvector corresponding to a complex eigenvalue is
> stored in two consecutive columns, the first holding the real
> part and the second the imaginary part.
> If SIDE = 'R', VL is not referenced.

LDVL : INTEGER [in]
> The leading dimension of the array VL.
> LDVL >= max(1,N) if SIDE = 'L' or 'B'; LDVL >= 1 otherwise.

VR : REAL array, dimension (LDVR,MM) [in,out]
> On entry, if INITV = 'U' and SIDE = 'R' or 'B', VR must
> contain starting vectors for the inverse iteration for the
> right eigenvectors; the starting vector for each eigenvector
> must be in the same column(s) in which the eigenvector will
> be stored.
> On exit, if SIDE = 'R' or 'B', the right eigenvectors
> specified by SELECT will be stored consecutively in the
> columns of VR, in the same order as their eigenvalues. A
> complex eigenvector corresponding to a complex eigenvalue is
> stored in two consecutive columns, the first holding the real
> part and the second the imaginary part.
> If SIDE = 'L', VR is not referenced.

LDVR : INTEGER [in]
> The leading dimension of the array VR.
> LDVR >= max(1,N) if SIDE = 'R' or 'B'; LDVR >= 1 otherwise.

MM : INTEGER [in]
> The number of columns in the arrays VL and/or VR. MM >= M.

M : INTEGER [out]
> The number of columns in the arrays VL and/or VR required to
> store the eigenvectors; each selected real eigenvector
> occupies one column and each selected complex eigenvector
> occupies two columns.

WORK : REAL array, dimension ((N+2)\*N) [out]

IFAILL : INTEGER array, dimension (MM) [out]
> If SIDE = 'L' or 'B', IFAILL(i) = j > 0 if the left
> eigenvector in the i-th column of VL (corresponding to the
> eigenvalue w(j)) failed to converge; IFAILL(i) = 0 if the
> eigenvector converged satisfactorily. If the i-th and (i+1)th
> columns of VL hold a complex eigenvector, then IFAILL(i) and
> IFAILL(i+1) are set to the same value.
> If SIDE = 'R', IFAILL is not referenced.

IFAILR : INTEGER array, dimension (MM) [out]
> If SIDE = 'R' or 'B', IFAILR(i) = j > 0 if the right
> eigenvector in the i-th column of VR (corresponding to the
> eigenvalue w(j)) failed to converge; IFAILR(i) = 0 if the
> eigenvector converged satisfactorily. If the i-th and (i+1)th
> columns of VR hold a complex eigenvector, then IFAILR(i) and
> IFAILR(i+1) are set to the same value.
> If SIDE = 'L', IFAILR is not referenced.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, i is the number of eigenvectors which
> failed to converge; see IFAILL and IFAILR for further
> details.
